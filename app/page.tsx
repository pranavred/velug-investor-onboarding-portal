import {OnboardingDemo} from '@/components/investor-onboarding/onboarding-demo';
import {BackendWalkthrough} from '@/components/investor-onboarding/backend-walkthrough';
import './onboarding.css';
export default function Home(){return <div className="ob-page"><header className="ob-page-intro"><div><p className="ob-eyebrow">Open-source / self-hostable</p><h1>Investor onboarding.<br/><span>Evidence to review.</span></h1></div><div className="ob-intro-summary"><p>Classify documents. Extract fields. Inspect every source.</p><p>Explore the recorded samples or connect your own Anthropic key.</p></div></header><OnboardingDemo/><BackendWalkthrough/></div>}
