provider "azurerm" {
  subscription_id = var.subscription_id

  resource_providers_to_register = [
    "Microsoft.App",
    "Microsoft.ContainerRegistry",
    "Microsoft.ManagedIdentity",
  ]

  features {}
}

provider "azapi" {
  subscription_id = var.subscription_id
}
