import type { SlideConfig } from '@/types/slide';

// Intro
import { Slide00Start } from './intro/Slide00Start';
import { Slide01WhoWeAre } from './intro/Slide01WhoWeAre';
import { SlideOpportunity } from './intro/SlideOpportunity';
import { SlideWhatThisEnables } from './intro/SlideWhatThisEnables';

// Case Studies
import { SectionCaseStudiesDivider } from './usecases/SectionCaseStudiesDivider';
import { SlideCaseStudyVisual } from './usecases/SlideCaseStudyVisual';
import { SlideCaseStudyDetails } from './usecases/SlideCaseStudyDetails';

// Outro
import { Slide14WhatWeOffer } from './outro/Slide14WhatWeOffer';
import { SlidePricingModel } from './outro/SlidePricingModel';
import { SlideNextSteps } from './outro/SlideNextSteps';

export const SLIDES: SlideConfig[] = [
  // ===== INTRO SECTION =====
  {
    id: '00-start',
    title: 'NovaTech Solutions',
    section: 'intro',
    component: Slide00Start,
  },
  {
    id: '01-who-we-are',
    title: 'Who We Are',
    section: 'intro',
    component: Slide01WhoWeAre,
  },
  {
    id: '02-opportunity',
    title: 'The Opportunity',
    section: 'intro',
    component: SlideOpportunity,
  },
  {
    id: '03-what-this-enables',
    title: 'What Does This Enable?',
    section: 'intro',
    component: SlideWhatThisEnables,
  },

  // ===== CASE STUDIES SECTION =====
  {
    id: '04-case-studies-divider',
    title: 'Case Studies',
    section: 'usecases',
    component: SectionCaseStudiesDivider,
    isDivider: true,
  },
  {
    id: '05-case-study-visual',
    title: 'Supply Chain Optimization',
    section: 'usecases',
    component: SlideCaseStudyVisual,
  },
  {
    id: '06-case-study-details',
    title: 'Supply Chain - Details',
    section: 'usecases',
    component: SlideCaseStudyDetails,
  },

  // ===== OUTRO SECTION =====
  {
    id: '07-what-we-offer',
    title: 'What We Offer',
    section: 'outro',
    component: Slide14WhatWeOffer,
  },
  {
    id: '08-pricing-model',
    title: 'Pricing Model',
    section: 'outro',
    component: SlidePricingModel,
  },
  {
    id: '09-next-steps',
    title: 'Next Steps',
    section: 'outro',
    component: SlideNextSteps,
  },
];
