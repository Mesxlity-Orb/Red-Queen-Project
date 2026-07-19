import { API_BASE_URL } from '../utils/apiConfig';

export const sendChatMessage = async (message: string, history: any[]) => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  return response.json();
};