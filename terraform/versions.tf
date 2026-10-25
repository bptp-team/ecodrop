terraform {
  required_version = "~> 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.5"
    }
  }

  # Created once outside Terraform. See "State" in the README.
  backend "azurerm" {
    resource_group_name  = "ecodrop-tfstate-rg"
    storage_account_name = "ecodroptfstate"
    container_name       = "tfstate"
    key                  = "ecodrop.tfstate"
    use_azuread_auth     = true
  }
}
