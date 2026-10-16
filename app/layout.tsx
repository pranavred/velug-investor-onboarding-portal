import type {Metadata} from 'next';
import Link from 'next/link';
import {readServerConfig} from '@/lib/config/server';
import './globals.css';
export const dynamic='force-dynamic';
export function generateMetadata():Metadata{return {title:readServerConfig(process.env).appName,description:'Explore document classification, extraction, source checks and human review.'};}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){const name=readServerConfig(process.env).appName;return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><header className="product-header"><Link href="/" className="product-brand"><span className="brand-mark" aria-hidden="true">V</span><strong>{name}</strong></Link><a href="https://github.com/pranavred/velug-investor-onboarding-portal" target="_blank" rel="noreferrer">View on GitHub ↗</a></header><main id="main-content">{children}</main><footer className="product-footer"><span>Open-source demo / fictional evidence / human review required</span><a href="https://github.com/pranavred/velug-investor-onboarding-portal">Source & deployment guide ↗</a></footer></body></html>}
