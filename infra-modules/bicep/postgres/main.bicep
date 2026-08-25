// =====================================================================================
// Module: Azure Database for PostgreSQL Flexible Server
// Purpose: Provisions a PostgreSQL Flexible Server with the pgvector extension allow-listed
//          for downstream CREATE EXTENSION use, plus secure-by-default backup and high
//          availability settings.
// apiVersion note: 2023-06-01-preview is pinned deliberately. It is the newest flexible
// server apiVersion this module author could confirm the exact resource shape for
// (sku, properties.storage, properties.backup, properties.highAvailability, and the
// configurations child resource) with high confidence. Re-pin to a later GA apiVersion
// once it has been validated with az bicep build / az deployment what-if.
// =====================================================================================

@description('Base resource name. Combined with a resource-type prefix and the environment to form the server name.')
param name string

@description('Azure region for the server. Defaults to the resource group location.')
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

@description('PostgreSQL administrator login name. Required even when Entra ID authentication is layered on afterward, because flexible servers always provision a password-auth administrator.')
param administratorLogin string

@description('PostgreSQL administrator login password.')
@secure()
param administratorLoginPassword string

@description('PostgreSQL major version. Maps to the server version property.')
@allowed([
  '14'
  '15'
  '16'
])
param postgresVersion string = '16'

@description('Compute SKU name, for example Standard_B1ms, Standard_D2ds_v5.')
param skuName string = 'Standard_B1ms'

@description('Compute SKU tier. Burstable is the lowest-cost option for dev/test; use GeneralPurpose or MemoryOptimized for steady production load.')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param skuTier string = 'Burstable'

@description('Provisioned storage size in GB.')
param storageSizeGB int = 32

@description('Number of days backups are retained.')
@minValue(7)
@maxValue(35)
param backupRetentionDays int = 7

@description('Geo-redundant backup storage. Disabled by default to avoid cross-region data residency surprises; enable it deliberately once the compliance boundary allows cross-region backup storage.')
@allowed([
  'Enabled'
  'Disabled'
])
param geoRedundantBackup string = 'Disabled'

@description('High availability mode. Disabled by default to keep the baseline low-cost; ZoneRedundant is recommended for production once cost and zonal availability are confirmed for the target region.')
@allowed([
  'Disabled'
  'ZoneRedundant'
  'SameZone'
])
param highAvailabilityMode string = 'Disabled'

// Automatic tags are merged last so they always win over caller-supplied values with the same key.
var resourceTags = union(tags, {
  environment: environment
  managedBy: 'prod-ready-ai-app'
})

// Flexible server names must be 3-63 characters, lowercase, and end with a letter or digit.
// take() enforces the ceiling; the trailing-hyphen guard keeps a long name/environment
// combination from truncating onto an invalid dash.
var serverNameRaw = toLower('psql-${name}-${environment}')
var serverNameTruncated = take(serverNameRaw, 63)
var serverName = endsWith(serverNameTruncated, '-') ? take(serverNameTruncated, length(serverNameTruncated) - 1) : serverNameTruncated

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: serverName
  location: location
  tags: resourceTags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    // authConfig / Microsoft Entra authentication: this module provisions password
    // authentication only. Layer Entra ID authentication on top (an active directory
    // administrator assignment, then flipping authConfig.activeDirectoryAuth to Enabled)
    // for identity-based, CJIS/FedRAMP-aligned access in production. That requires a
    // directory object ID supplied by the caller, which is intentionally kept out of this
    // reusable module so the module has no external identity dependency by default.
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: geoRedundantBackup
    }
    highAvailability: {
      mode: highAvailabilityMode
    }
  }
}

// Allow-lists the pgvector extension so a database administrator can subsequently run
// CREATE EXTENSION vector; on the target database. Allow-listing alone does not install
// the extension into any database; that step is a DBA action, not part of this module.
resource pgVectorAllowlist 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-06-01-preview' = {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR'
    source: 'user-override'
  }
}

@description('Resource ID of the PostgreSQL flexible server.')
output serverId string = postgresServer.id

@description('Name of the PostgreSQL flexible server.')
output serverName string = postgresServer.name

@description('Fully qualified domain name used to connect to the server.')
output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName
