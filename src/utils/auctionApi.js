const ENCRYPTION_API_BASE_URL =
  import.meta.env.VITE_ENCRYPTION_API_BASE_URL || 'http://localhost:4000/api/encryption';

const AUCTIONS_API_BASE_URL = ENCRYPTION_API_BASE_URL.replace(/\/encryption\/?$/, '/auctions');

export async function fetchAuctionMetadata() {
  const response = await fetch(`${AUCTIONS_API_BASE_URL}/metadata`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch auction metadata');
  }

  return data.metadata || {};
}

export async function saveAuctionMetadata(metadata) {
  const response = await fetch(`${AUCTIONS_API_BASE_URL}/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to save auction metadata');
  }

  return data.metadata;
}

export async function fetchAuctionResolution(auctionPda) {
  const response = await fetch(`${AUCTIONS_API_BASE_URL}/resolution/${auctionPda}`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch auction resolution');
  }

  return data.resolution;
}

export async function fetchAuctionResolutions(auctionPdas) {
  const results = await Promise.all(
    auctionPdas.map(async (auctionPda) => {
      try {
        const resolution = await fetchAuctionResolution(auctionPda);
        return [auctionPda, resolution];
      } catch (_error) {
        return [auctionPda, null];
      }
    })
  );

  return Object.fromEntries(results.filter(([, resolution]) => resolution));
}

export default {
  fetchAuctionMetadata,
  saveAuctionMetadata,
  fetchAuctionResolution,
  fetchAuctionResolutions,
};
