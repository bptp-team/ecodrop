locals {
  tags = {
    project    = "ecodrop"
    managed_by = "terraform"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "ecodrop-rg"
  location = "mexicocentral"
  tags     = local.tags
}

# The name is globally unique. If it is ever taken, change it here and in the workflow.
resource "azurerm_container_registry" "main" {
  name                = "ecodropacr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

# The app pulls its image with this identity. Unlike the app's own identity, it can be
# granted AcrPull before the app exists.
resource "azurerm_user_assigned_identity" "pull" {
  name                = "ecodrop-pull"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
}

resource "azurerm_role_assignment" "pull_acr_pull" {
  scope                            = azurerm_container_registry.main.id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_user_assigned_identity.pull.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}

# Without a Log Analytics workspace the logs are only streamed, so the environment
# itself costs nothing.
resource "azurerm_container_app_environment" "main" {
  name                = "ecodrop-env"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
}

resource "azurerm_container_app" "main" {
  name                         = "ecodrop"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.pull.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.pull.id
  }

  template {
    # Scaling to zero keeps the app within the monthly free grant. The first request
    # after an idle period waits a few seconds for the container to start.
    min_replicas = 0
    max_replicas = 1

    container {
      name = "ecodrop"
      # Placeholder that also listens on 8080, replaced by the first release.
      image  = "docker.io/nginxinc/nginx-unprivileged:alpine"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  # The pipeline owns the image. Applying again must not roll it back to the placeholder.
  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }

  depends_on = [azurerm_role_assignment.pull_acr_pull]
}

# Deployment identity

# The tenant forbids application registrations, so the pipeline authenticates with a
# user-assigned identity, which is a subscription resource.
resource "azurerm_user_assigned_identity" "cd" {
  name                = "ecodrop-cd"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
}

# The repository presents an immutable subject, which carries the numeric owner and
# repository IDs.
resource "azurerm_federated_identity_credential" "cd" {
  name                      = "github-production"
  user_assigned_identity_id = azurerm_user_assigned_identity.cd.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "repo:${var.github_owner}@${var.github_owner_id}/ecodrop@${var.github_repo_id}:environment:production"
}

resource "azurerm_role_assignment" "cd_acr_push" {
  scope                            = azurerm_container_registry.main.id
  role_definition_name             = "AcrPush"
  principal_id                     = azurerm_user_assigned_identity.cd.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}

# A deploy only replaces the image, so the pipeline cannot delete the app or change
# the identity it signs in with.
resource "azurerm_role_definition" "deployer" {
  name        = "EcoDrop Deployer"
  scope       = azurerm_resource_group.main.id
  description = "Deploys new images to the EcoDrop container app."

  permissions {
    actions = [
      "Microsoft.App/containerApps/read",
      "Microsoft.App/containerApps/write",
      "Microsoft.App/containerApps/*/read",
    ]
  }

  assignable_scopes = [azurerm_resource_group.main.id]
}

resource "azurerm_role_assignment" "cd_deployer" {
  scope                            = azurerm_container_app.main.id
  role_definition_id               = azurerm_role_definition.deployer.role_definition_resource_id
  principal_id                     = azurerm_user_assigned_identity.cd.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}
