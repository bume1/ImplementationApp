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

async function getRecord(recordId) {
  try {
    const client = await getHubSpotClient();
    const response = await client.crm.deals.basicApi.getById(recordId, ['dealname', 'dealstage', 'pipeline', 'amount']);
    return response;
  } catch (error) {
    console.error('Error fetching record:', error.message);
    throw error;
  }
}

async function updateRecordStage(recordId, stageId, pipelineId = null) {
  try {
    const client = await getHubSpotClient();
    const properties = { dealstage: stageId };
    if (pipelineId) {
      properties.pipeline = pipelineId;
    }
    
    console.log(`📤 Updating HubSpot record ${recordId} with properties:`, JSON.stringify(properties));
    
    const response = await client.crm.deals.basicApi.update(recordId, { properties });
    
    console.log(`✅ HubSpot record ${recordId} updated - Response stage: ${response.properties?.dealstage}`);
    return response;
  } catch (error) {
    console.error('Error updating record stage:', error.message);
    if (error.body) {
      console.error('HubSpot API error details:', JSON.stringify(error.body));
    }
    throw error;
  }
}

async function logRecordActivity(recordId, activityType, details) {
  try {
    const client = await getHubSpotClient();
    
    const noteBody = `[Project Tracker] ${activityType}\n\n${details}`;
    
    const noteObj = {
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_note_body: noteBody
      },
      associations: [
        {
          to: { id: recordId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 214
            }
          ]
        }
      ]
    };

    const noteResponse = await client.crm.objects.notes.basicApi.create(noteObj);

    console.log(`✅ HubSpot activity logged for record ${recordId}: ${activityType}`);
    return noteResponse;
  } catch (error) {
    console.error('Error logging record activity:', error.message);
    if (error.body) {
      console.error('HubSpot API error details:', JSON.stringify(error.body));
    }
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

async function getOwners() {
  try {
    const client = await getHubSpotClient();
    const response = await client.crm.owners.ownersApi.getPage();
    return response.results || [];
  } catch (error) {
    console.error('Error fetching HubSpot owners:', error.message);
    return [];
  }
}

async function findOwnerByName(firstName, lastName) {
  try {
    const owners = await getOwners();
    const match = owners.find(owner => {
      const ownerFirst = (owner.firstName || '').toLowerCase().trim();
      const ownerLast = (owner.lastName || '').toLowerCase().trim();
      return ownerFirst === firstName.toLowerCase().trim() && 
             ownerLast === lastName.toLowerCase().trim();
    });
    return match ? match.id : null;
  } catch (error) {
    console.error('Error finding owner by name:', error.message);
    return null;
  }
}

async function findOwnerByEmail(email) {
  try {
    const owners = await getOwners();
    const normalizedEmail = email.toLowerCase().trim();
    const match = owners.find(owner => {
      const ownerEmail = (owner.email || '').toLowerCase().trim();
      return ownerEmail === normalizedEmail;
    });
    if (match) {
      console.log(`📧 Found HubSpot owner by email "${email}": ${match.id}`);
    }
    return match ? match.id : null;
  } catch (error) {
    console.error('Error finding owner by email:', error.message);
    return null;
  }
}

async function uploadFileAndAttachToDeal(dealId, fileContent, fileName) {
  if (!dealId) {
    throw new Error('Deal ID is required for file upload');
  }
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('File content must be a non-empty string');
  }
  if (!fileName) {
    throw new Error('File name is required');
  }
  
  try {
    const client = await getHubSpotClient();
    const accessToken = await getAccessToken();
    
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', Buffer.from(fileContent, 'utf8'), {
      filename: fileName,
      contentType: 'text/html; charset=utf-8'
    });
    formData.append('folderPath', '/soft-pilot-checklists');
    formData.append('options', JSON.stringify({ access: 'PRIVATE' }));
    
    const uploadResponse = await fetch('https://api.hubapi.com/files/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`File upload failed: ${errorText}`);
    }
    
    const fileData = await uploadResponse.json();
    console.log(`✅ File uploaded to HubSpot: ${fileData.id}`);
    
    const noteBody = `[Project Tracker] Soft-Pilot Checklist Submitted\n\nA signed soft-pilot checklist has been submitted for this deal.\n\nFile: ${fileName}\nFile ID: ${fileData.id}\nFile URL: ${fileData.url || 'Available in HubSpot Files'}`;
    
    const noteObj = {
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_note_body: noteBody,
        hs_attachment_ids: fileData.id.toString()
      },
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 214
            }
          ]
        }
      ]
    };
    
    const noteResponse = await client.crm.objects.notes.basicApi.create(noteObj);
    console.log(`✅ Note with attachment created for deal ${dealId}`);
    
    return { fileId: fileData.id, noteId: noteResponse.id };
  } catch (error) {
    console.error('Error uploading file to HubSpot:', error.message);
    throw error;
  }
}

async function createTask(dealId, taskSubject, taskBody, ownerId = null) {
  try {
    const client = await getHubSpotClient();
    
    const taskInput = {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_task_subject: taskSubject,
        hs_task_body: taskBody,
        hs_task_status: 'COMPLETED',
        hs_task_priority: 'MEDIUM',
        hs_task_type: 'TODO'
      },
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 216
            }
          ]
        }
      ]
    };
    
    if (ownerId) {
      taskInput.properties.hubspot_owner_id = ownerId;
    }
    
    const response = await client.crm.objects.basicApi.create('tasks', taskInput);
    console.log(`✅ HubSpot task created and completed: ${taskSubject}`);
    return response;
  } catch (error) {
    console.error('Error creating HubSpot task:', error.message);
    if (error.body) {
      console.error('HubSpot API error details:', JSON.stringify(error.body));
    }
    throw error;
  }
}

module.exports = {
  getHubSpotClient,
  getPipelines,
  findOwnerByEmail,
  getRecord,
  updateRecordStage,
  logRecordActivity,
  testConnection,
  getOwners,
  findOwnerByName,
  createTask,
  uploadFileAndAttachToDeal
};
