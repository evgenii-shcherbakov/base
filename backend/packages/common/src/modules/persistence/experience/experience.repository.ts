import { Experience } from 'interfaces';
import { DatabaseRepository } from 'repositories';

export const EXPERIENCE_REPOSITORY = Symbol('ExperienceRepository');

export interface ExperienceRepository extends DatabaseRepository<Experience> {}
