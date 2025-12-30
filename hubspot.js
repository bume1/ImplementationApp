const { Client } = require('@hubspot/api-client');

let connectionSettings = null;

async function getAccessToken() {
  if (connectionSettings?.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error('HubSpot connector not configured - REPLIT_CONNECTORS_HOSTNAME not found');
  }
  
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('HubSpot connector authentication not available');
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=hubspot',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch HubSpot connection settings');
    }
    
    const data = await response.json();
    connectionSettings = data.items?.[0];
  } catch (error) {
    throw new Error('Failed to connect to HubSpot: ' + error.message);
  }

  if (!connectionSettings) {
    throw new Error('HubSpot connector not configured');
  }

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('HubSpot not connected - no access token found');
  }
  return accessToken;
}

async function getHubSpotClient() {
  const accessToken = await getAccessToken();
  return new Client({ accessToken });
}

async function getPipelines() {
  try {
    const client = await getHubSpotClient();
    const response = await client.crm.pipelines.pipelinesApi.getAll('deals');
    return response.results.map(pipeline => ({
      id: pipeline.id,
      label: pipeline.label,
      stages: pipeline.stages.map(stage => ({
        id: stage.id,
        label: stage.label,
        displayOrder: stage.displayOrder
      })).sort((a, b) => a.displayOrder - b.displayOrder)
    }));
  } catch (error) {
    console.error('Error fetching HubSpot pipelines:', error.message);
    throw error;
  }
}

async function getDeal(dealId) {
  try {
    const client = await getHubSpotClient();
    const response = await client.crm.deals.basicApi.getById(dealId, ['dealname', 'dealstage', 'pipeline', 'amount']);
    return response;
  } catch (error) {
    console.error('Error fetching deal:', error.message);
    throw error;
  }
}

async function updateDealStage(dealId, stageId, pipelineId = null) {
  try {
    const client = await getHubSpotClient();
    const properties = { dealstage: stageId };
    if (pipelineId) {
      properties.pipeline = pipelineId;
    }
    const response = await client.crm.deals.basicApi.update(dealId, { properties });
    console.log(`✅ HubSpot deal ${dealId} updated to stage ${stageId}`);
    return response;
  } catch (error) {
    console.error('Error updating deal stage:', error.message);
    throw error;
  }
}

async function logDealActivity(dealId, activityType, details) {
  try {
    const client = await getHubSpotClient();
    
    const noteBody = `[Project Tracker] ${activityType}\n\n${details}`;
    
    const noteProperties = {
      hs_timestamp: Date.now(),
      hs_note_body: noteBody
    };

    const noteResponse = await client.crm.objects.notes.basicApi.create({
      properties: noteProperties
    });

    await client.crm.objects.notes.associationsApi.create(
      noteResponse.id,
      'deals',
      dealId,
      [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
    );

    console.log(`✅ HubSpot activity logged for deal ${dealId}: ${activityType}`);
    return noteResponse;
  } catch (error) {
    console.error('Error logging deal activity:', error.message);
    throw error;
  }
}

async function testConnection() {
  try {
    const client = await getHubSpotClient();
    const response = await client.crm.pipelines.pipelinesApi.getAll('deals');
    return { connected: true, pipelineCount: response.results.length };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

module.exports = {
  getHubSpotClient,
  getPipelines,
  getDeal,
  updateDealStage,
  logDealActivity,
  testConnection
};
