variable "subscription_id" {
  description = "Azure subscription ID where the resources will be created."
  type        = string
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
}

variable "github_owner_id" {
  description = "Numeric ID of the GitHub owner, used by the immutable OIDC subject."
  type        = string
}

variable "github_repo_id" {
  description = "Numeric ID of the ecodrop repository, used by the immutable OIDC subject."
  type        = string
}
