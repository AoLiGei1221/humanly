const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://humory_user:humory_password@localhost:5432/humory_dev'
});

async function checkEvents() {
  try {
    // Get certificate document ID
    const certResult = await pool.query(
      "SELECT document_id FROM certificates WHERE verification_token = '1c2a9afc372a7cb4fe411d6bf5cb95bf7b084d0b828b396065ad0cca7cd1643f'"
    );

    if (certResult.rows.length === 0) {
      console.log('Certificate not found');
      process.exit(1);
    }

    const documentId = certResult.rows[0].document_id;
    console.log('Document ID:', documentId);

    // Check events
    const eventStats = await pool.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN editor_state_after IS NOT NULL THEN 1 END) as has_editor_state,
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event
      FROM document_events
      WHERE document_id = $1
    `, [documentId]);

    console.log('\nEvent Statistics:');
    console.log(JSON.stringify(eventStats.rows[0], null, 2));

    // Get a sample event with editor state
    const sampleEvent = await pool.query(`
      SELECT
        event_type,
        timestamp,
        text_before,
        text_after,
        editor_state_before,
        editor_state_after
      FROM document_events
      WHERE document_id = $1
        AND editor_state_after IS NOT NULL
      ORDER BY timestamp ASC
      LIMIT 5
    `, [documentId]);

    console.log('\nSample Events (first 5 with editor state):');
    sampleEvent.rows.forEach((event, idx) => {
      console.log(`\n--- Event ${idx + 1} ---`);
      console.log('Type:', event.event_type);
      console.log('Timestamp:', event.timestamp);
      console.log('Text Before:', event.text_before ? event.text_before.substring(0, 50) : 'null');
      console.log('Text After:', event.text_after ? event.text_after.substring(0, 50) : 'null');
      console.log('Has Editor State Before:', !!event.editor_state_before);
      console.log('Has Editor State After:', !!event.editor_state_after);
      if (event.editor_state_after) {
        const state = typeof event.editor_state_after === 'string'
          ? JSON.parse(event.editor_state_after)
          : event.editor_state_after;
        console.log('Editor State After (preview):', JSON.stringify(state).substring(0, 200));
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkEvents();
