const { api_url } = process.env;

export const createMippi = (phoneNumber: string, name: string, species: number) => {
    return fetch(`${api_url}/create`, {
        method: "POST",
        body: JSON.stringify({
            phoneNumber,
            name,
            species
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

export const getSpecies = () => {
    return fetch(`${api_url}/species`);
}