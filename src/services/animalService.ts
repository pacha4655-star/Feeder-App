import { Animal } from '../types';

/**
 * Notice: The 'animals' table does not exist in the connected Supabase database.
 * No fake data is created. Missing schema is reported.
 */
export const fetchAnimalsFromSupabase = async (): Promise<Animal[]> => {
  return [];
};

export const subscribeToAnimals = (
  onUpdate: (animals: Animal[]) => void,
  _onError?: (err: Error) => void
) => {
  onUpdate([]);
  return () => {};
};

export const createAnimalInSupabase = async (_animal: Partial<Animal>): Promise<string> => {
  throw new Error('Animal registration is currently unavailable (table "animals" does not exist in database).');
};
