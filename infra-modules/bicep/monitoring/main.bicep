// =====================================================================================
// Module: Monitoring (Log Analytics workspace + workspace-based Application Insights)
// Purpose: Provisions the shared observability backend for a workload: a Log Analytics
//          workspace and a workspace-based Application Insights component, giving
//          downstream resources a diagnostic-settings target and application telemetry
//          out of the box.
// =====================================================================================

@description('Base resource name. Combined with a resource-type prefix and the environment to form the workspace and Application Insights names.')
param name string

@description('Azure region for the workspace and Application Insights component. Defaults to the resource group location.')
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

@description('Log Analytics data retention window in days. 30 is the free-tier-friendly default; extend it for environments with longer audit or compliance retention requirements.')
@minValue(30)
@maxValue(730)
param retentionInDays int = 30

// Automatic tags are merged last so they always win over caller-supplied values with the same key.
var resourceTags = union(tags, {
  environment: environment
  managedBy: 'prod-ready-ai-app'
})

// Log Analytics workspace names must be 4-63 characters; take() enforces the ceiling and
// keeps this module safe for longer name/environment combinations.
var workspaceName = take(toLower('log-${name}-${environment}'), 63)
var appInsightsName = take(toLower('appi-${name}-${environment}'), 63)

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: resourceTags
  properties: {
    sku: {
      name: 'PerGB2018' // pay-as-you-go per-GB pricing; predictable and does not require a capacity commitment
    }
    retentionInDays: retentionInDays
  }
}

// Workspace-based Application Insights: telemetry is stored in the Log Analytics workspace
// above instead of a classic, standalone Application Insights store.
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: resourceTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
  }
}

@description('Resource ID of the Log Analytics workspace.')
output workspaceId string = logAnalyticsWorkspace.id

@description('Name of the Log Analytics workspace.')
output workspaceName string = logAnalyticsWorkspace.name

@description('Workspace customerId (GUID), used by agents and SDKs that authenticate directly against the workspace.')
output workspaceCustomerId string = logAnalyticsWorkspace.properties.customerId

@description('Resource ID of the Application Insights component.')
output appInsightsId string = appInsights.id

@description('Name of the Application Insights component.')
output appInsightsName string = appInsights.name

@description('Application Insights connection string. Not a secret in the credential sense, but treat it like configuration data: pass it through app settings or environment variables at deploy time, never commit it to source control.')
output appInsightsConnectionString string = appInsights.properties.ConnectionString

@description('Application Insights instrumentation key (legacy). Prefer the connection string above for new integrations.')
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
