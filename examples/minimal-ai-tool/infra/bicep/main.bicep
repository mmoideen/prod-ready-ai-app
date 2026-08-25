// =====================================================================================
// examples/minimal-ai-tool: infrastructure entry point (Bicep)
// Wires the shared keyvault and monitoring Bicep modules from infra-modules/ via
// relative paths. See ../README.md for the relative path vs git URL sourcing note.
// =====================================================================================

targetScope = 'resourceGroup'

@description('Base resource name used to derive the Key Vault, Log Analytics, and Application Insights names.')
param appName string = 'minimal-ai-tool'

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Deployment environment.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('Additional resource tags applied to every resource created by this template.')
param tags object = {
  owner: '{{OWNER_NAME}}'
  app: 'minimal-ai-tool'
}

// Key Vault: holds API_TOKENS (in a real deployment) and, when the Azure OpenAI
// provider is in use, AZURE_OPENAI_API_KEY. See src/auth.ts and
// src/ai/azure-openai.ts for why these stay out of plain environment variables in
// production.
module keyvault '../../../../infra-modules/bicep/keyvault/main.bicep' = {
  name: 'deploy-minimal-ai-tool-keyvault'
  params: {
    name: appName
    location: location
    environment: environment
    tags: tags
  }
}

// Monitoring: Log Analytics workspace + workspace-based Application Insights, the
// diagnostic-settings target and telemetry backend for the structured JSON logs
// src/logger.ts writes on every request.
module monitoring '../../../../infra-modules/bicep/monitoring/main.bicep' = {
  name: 'deploy-minimal-ai-tool-monitoring'
  params: {
    name: appName
    location: location
    environment: environment
    tags: tags
  }
}

// infra-modules/bicep/postgres is intentionally NOT consumed here. This tool is
// stateless: it summarizes ticket text on request and keeps no persistent state of
// its own (the in-memory request counters behind GET /api/admin/stats reset on
// restart), so there is no database to provision. See ../README.md.

@description('URI used by SDKs and the az CLI to address the Key Vault.')
output keyVaultUri string = keyvault.outputs.keyVaultUri

@description('Application Insights connection string. Pass through app settings or environment variables at deploy time; never commit it to source control.')
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString

@description('Resource ID of the Log Analytics workspace, for wiring diagnostic settings.')
output workspaceId string = monitoring.outputs.workspaceId
