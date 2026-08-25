// =====================================================================================
// Module: Azure Key Vault
// Purpose: Provisions a Key Vault with secure-by-default settings (RBAC authorization,
//          purge protection, deny-by-default network ACLs) suitable for CJIS / FedRAMP
//          style environments. Reference this file from a consumer template via a
//          relative module path.
// =====================================================================================

@description('Base resource name. Combined with a resource-type prefix and the environment to form the Key Vault name.')
param name string

@description('Azure region for the Key Vault. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Deployment environment. Drives the automatic environment tag and the resource name suffix.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string

@description('Additional resource tags supplied by the caller. Merged with the automatic environment and managedBy tags; the automatic tags take precedence on key collisions.')
param tags object = {}

@description('Microsoft Entra tenant ID that owns the vault. Defaults to the deployment subscription tenant.')
param tenantId string = subscription().tenantId

@description('Use Azure RBAC for data-plane authorization instead of vault access policies. Left true by default so access is granted through auditable role assignments rather than a vault-local policy list.')
param enableRbacAuthorization bool = true

@description('Enable purge protection so a deleted vault, and the secrets/keys inside it, cannot be permanently purged before the retention window elapses. This is a one-way switch: once enabled on a vault it cannot be turned back off.')
param enablePurgeProtection bool = true

@description('Number of days a deleted vault object is recoverable before permanent deletion. Kept high by default to protect against accidental or malicious deletion.')
@minValue(7)
@maxValue(90)
param softDeleteRetentionInDays int = 90

@description('Key Vault SKU. premium adds HSM-backed keys; choose it when FIPS 140-2 Level 2 backed keys are required.')
@allowed([
  'standard'
  'premium'
])
param skuName string = 'standard'

@description('Whether the vault is reachable over the public internet. Defaults to Enabled for baseline/dev usability; production deployments should set this to Disabled and front the vault with a Private Endpoint instead.')
@allowed([
  'Enabled'
  'Disabled'
])
param publicNetworkAccess string = 'Enabled'

@description('Default action for traffic that does not match an explicit network rule. Deny by default so only trusted Azure services and explicitly allowed networks can reach the vault.')
@allowed([
  'Allow'
  'Deny'
])
param networkAclsDefaultAction string = 'Deny'

// Automatic tags are merged last so they always win over caller-supplied values with the same key.
var resourceTags = union(tags, {
  environment: environment
  managedBy: 'prod-ready-ai-app'
})

// Key Vault names must be globally unique, 3-24 characters, start with a letter, and end
// with a letter or digit. take() enforces the length ceiling; the trailing-hyphen guard
// keeps a long name/environment combination from truncating onto an invalid dash.
var vaultNameRaw = toLower('kv-${name}-${environment}')
var vaultNameTruncated = take(vaultNameRaw, 24)
var vaultName = endsWith(vaultNameTruncated, '-') ? take(vaultNameTruncated, length(vaultNameTruncated) - 1) : vaultNameTruncated

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  tags: resourceTags
  properties: {
    sku: {
      family: 'A'
      name: skuName
    }
    tenantId: tenantId
    // accessPolicies is intentionally omitted: RBAC authorization is the supported access
    // model for this module, granted via Azure role assignments outside this template.
    enableRbacAuthorization: enableRbacAuthorization
    enablePurgeProtection: enablePurgeProtection
    softDeleteRetentionInDays: softDeleteRetentionInDays
    publicNetworkAccess: publicNetworkAccess
    networkAcls: {
      defaultAction: networkAclsDefaultAction
      bypass: 'AzureServices' // lets first-party Azure services (backup, ARM template deployment, etc.) reach the vault even when defaultAction is Deny
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

@description('Resource ID of the Key Vault.')
output keyVaultId string = keyVault.id

@description('Name of the deployed Key Vault.')
output keyVaultName string = keyVault.name

@description('URI used by SDKs and the az CLI to address the vault, for example https://<name>.vault.azure.net/.')
output keyVaultUri string = keyVault.properties.vaultUri
