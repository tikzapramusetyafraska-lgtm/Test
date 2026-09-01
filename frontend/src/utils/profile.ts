export type Profile = {
  name: string;
  photoBase64: string | null;
};

export const PROFILE_KEY = "my-duwit-gwejh-profile-v1";

export const DEFAULT_PROFILE: Profile = {
  name: "Pemilik Duwit",
  photoBase64: null,
};
