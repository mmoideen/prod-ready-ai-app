// =====================================================================================
// template/infra/bicep/main.bicep
// Purpose: Environment entry point for internal-tool-template. Wires the shared
// infra-modules (Key Vault, Monitoring, PostgreSQL) with sensible dev defaults.
//
// While this file lives inside the prod-ready-ai-app toolkit repository, module
// sources below are relative paths into ../../../infra-modules/bicep/. After
// copying template/ out to a new repository, switch the module sources to the
// registry form, see ../README.md for the exact snippet and why plain git URLs
// are not an option for Bicep.
// =====================================================================================

@description('Base resource name shared by every resource this template deploys.')
param baseName string = 'internal-tool-template'

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Deployment environment.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('PostgreSQL administrator login name.')
param postgresAdminLogin string = 'appadmin'

@description('PostgreSQL administrator login password. Supply at deploy time, for example via a pipeline secret or --parameters postgresAdminPassword=. Never commit a real value.')
@secure()
param postgresAdminPassword string

@description('Additional resource tags applied to every resource this template deploys.')
param tags object = {}

module keyvault '../../../infra-modules/bicep/keyvault/main.bicep' = {
  name: 'deploy-keyvault'
  params: {
    name: baseName
    location: location
    environment: environment
    tags: tags
  }
}

module monitoring '../../../infra-modules/bicep/monitoring/main.bicep' = {
  name: 'deploy-monitoring'
  params: {
    name: baseName
    location: location
    environment: environment
    tags: tags
  }
}

module postgres '../../../infra-modules/bicep/postgres/main.bicep' = {
  name: 'deploy-postgres'
  params: {
    name: baseName
    location: location
    environment: environment
    tags: tags
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    skuName: 'Standard_B1ms'
    skuTier: 'Burstable'
    storageSizeGB: 32
  }
}

@description('Key Vault URI for app configuration. Wire this into the app deployment (Vercel env var or App Service setting) to fetch secrets at runtime.')
output keyVaultUri string = keyvault.outputs.keyVaultUri

@description('Application Insights connection string. Wire this into APPLICATIONINSIGHTS_CONNECTION_STRING so src/observability/otel.ts exports to Azure Monitor instead of the console.')
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString

@description('PostgreSQL server fully qualified domain name.')
output postgresServerFqdn string = postgres.outputs.serverFqdn
