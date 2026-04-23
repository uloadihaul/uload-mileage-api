export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pickup, dropoff } = req.body ?? {};

  if (!pickup || !dropoff) {
    return res.status(400).json({ error: 'Pickup and drop-off are required.' });
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters'
      },
      body: JSON.stringify({
        origin: { address: pickup },
        destination: { address: dropoff },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE'
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({
        error: 'Google route lookup failed',
        detail
      });
    }

    const data = await response.json();
    const meters = data?.routes?.[0]?.distanceMeters;

    if (typeof meters !== 'number') {
      return res.status(404).json({ error: 'No route found.' });
    }

    const oneWayMiles = meters / 1609.344;
    const roundTripMiles = oneWayMiles * 2;

    return res.status(200).json({
      oneWayMiles: Number(oneWayMiles.toFixed(1)),
      roundTripMiles: Number(roundTripMiles.toFixed(1))
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Unexpected server error',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
