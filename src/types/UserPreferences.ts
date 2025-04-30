export default interface UserPreferences {
    id: string; 
    user_id: string; 
    occupation: string | null; 
    traits: string[] | null;   
    additional_informations: string | null; 
    created_at: string; 
}