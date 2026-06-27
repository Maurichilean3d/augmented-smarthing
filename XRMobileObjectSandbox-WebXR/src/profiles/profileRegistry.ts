import { MobileObjectProfile, blenderProfile, genericProfile, hotwheelsProfile } from './mobileObjectProfile';

export class ProfileRegistry {
  private readonly byId = new Map<string, MobileObjectProfile>();

  constructor(
    public fallbackProfile: MobileObjectProfile = genericProfile,
    profiles: MobileObjectProfile[] = [genericProfile, hotwheelsProfile, blenderProfile]
  ) {
    for (const profile of profiles) this.byId.set(profile.profileId, profile);
  }

  resolve(profileId?: string | null): MobileObjectProfile {
    if (profileId && this.byId.has(profileId)) return this.byId.get(profileId)!;
    return this.fallbackProfile;
  }
}
