// Store active SSE clients
const clients = new Map();

/**
 * Send progress updates to a specific client
 * @param {string} clientId - Client identifier
 * @param {Object} data - Progress data to send
 * @returns {boolean} Success status
 */
export const sendProgress = (clientId, data) => {
  try {
    const client = clients.get(clientId);
    if (!client) {
      console.warn(`No client found for ID: ${clientId}`);
      return false;
    }

    // Validate progress data
    if (data.progress !== undefined) {
      data.progress = Math.min(Math.max(Math.round(data.progress), 0), 100);
    }
    if (!data.step) {
      data.step = "Processing...";
    }

    // Try to send the progress update
    const success = client.write(`data: ${JSON.stringify(data)}\n\n`);
    if (!success) {
      console.warn(`Failed to write to client: ${clientId}`);
      clients.delete(clientId);
      return false;
    }

    // Mark client as complete if progress is 100%
    if (data.progress === 100) {
      client._isComplete = true;
      // Clean up client after a short delay to ensure the last message is sent
      setTimeout(() => {
        clients.delete(clientId);
      }, 1000);
    }

    return true;
  } catch (error) {
    console.error(`Error sending progress to client ${clientId}:`, error);
    clients.delete(clientId);
    return false;
  }
};

/**
 * SSE endpoint for receiving progress updates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const changelogProgress = (req, res) => {
  const { owner, repo } = req.query;
  const clientId = `${owner}/${repo}`;

  // Return error if owner/repo not provided
  if (!owner || !repo) {
    res.status(400).json({ error: "Owner and repo parameters are required" });
    return;
  }

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable proxy buffering
  });

  // Send initial connection confirmation
  res.write('data: {"progress": 0, "step": "Connected"}\n\n');

  // Store client connection
  clients.set(clientId, res);

  // Clean up on client disconnect
  req.on("close", () => {
    // Check if this was an expected disconnection (after completion)
    const client = clients.get(clientId);
    if (client && client._isComplete) {
      console.log(
        `Client ${clientId} disconnected after successful completion`
      );
    } else {
      console.log(`Client ${clientId} disconnected unexpectedly`);
    }
    clients.delete(clientId);
  });

  // Handle errors
  req.on("error", (error) => {
    console.error(`Error with client ${clientId}:`, error);
    clients.delete(clientId);
  });
};
