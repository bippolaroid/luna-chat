export const getData = async (url: string) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response;
    
  } catch (err) {
    console.error(
      "Error fetching data:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
};
