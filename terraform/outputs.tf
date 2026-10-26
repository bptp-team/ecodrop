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
  value       = azapi_resource.environment.name
}

output "container_app_environment_static_ip" {
  description = "Static IP address of the Container Apps environment, the target of the domain's A record."
  value       = data.azurerm_container_app_environment.main.static_ip_address
}

output "container_app_fqdn" {
  description = "Azure-generated address of the app, which serves it without the custom domain."
  value       = azurerm_container_app.main.ingress[0].fqdn
}

output "custom_domain_verification_id" {
  description = "Value of the domain's asuid TXT record, which proves ownership to Azure."
  value       = azapi_resource.environment.output.properties.customDomainConfiguration.customDomainVerificationId
}

output "cd_client_id" {
  description = "ECODROP_CD_CLIENT_ID for the ecodrop repository."
  value       = azurerm_user_assigned_identity.cd.client_id
}

output "application_insights_connection_string" {
  description = "ECODROP_APPINSIGHTS_CONNECTION_STRING for the ecodrop repository. It only allows sending data, and the published site exposes it to every visitor."
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}
