output "resource_group_name" {
  description = "Name of the resource group, used to scope az commands."
  value       = azurerm_resource_group.main.name
}

output "acr_name" {
  description = "Name of the container registry, used by az acr login."
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "Registry hostname used in image tags."
  value       = azurerm_container_registry.main.login_server
}

output "container_app_name" {
  description = "Name of the container app, used to scope az commands."
  value       = azurerm_container_app.main.name
}

output "container_app_environment_name" {
  description = "Name of the Container Apps environment, used when binding the domain certificate."
  value       = azurerm_container_app_environment.main.name
}

output "container_app_fqdn" {
  description = "Azure-generated name of the app, the target of the domain's CNAME record."
  value       = azurerm_container_app.main.ingress[0].fqdn
}

output "custom_domain_verification_id" {
  description = "Value of the domain's asuid TXT record, which proves ownership to Azure."
  value       = azurerm_container_app_environment.main.custom_domain_verification_id
}

output "cd_client_id" {
  description = "ECODROP_CD_CLIENT_ID for the ecodrop repository."
  value       = azurerm_user_assigned_identity.cd.client_id
}
