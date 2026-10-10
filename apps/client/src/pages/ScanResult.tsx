
import { ArrowLeft, ArrowRight, Droplets, Eye, ScanFace, ShieldCheck, Sun, Waves } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import PageHeading from '../components/PageHeading';

type ScanLocationState = { fileName?: string; previewOnly?: boolean };

const metrics = [
	{ label: 'Hydration', value: '82%', delta: '+4%', icon: Droplets, tone: 'blue' },
	{ label: 'Texture', value: '76%', delta: '+2%', icon: Waves, tone: 'mint' },
	{ label: 'Oil balance', value: '71%', delta: 'steady', icon: Sun, tone: 'amber' },
	{ label: 'Pores', value: '68%', delta: 'steady', icon: Eye, tone: 'rose' },
];

export default function ScanResult() {
	const location = useLocation();
	const state = (location.state ?? {}) as ScanLocationState;
	return <div className="page-content result-page"><PageHeading eyebrow="Sample check-in · October 9" title="Scan result" description={state.fileName ? `Preview layout for ${state.fileName}. No analysis was performed.` : 'An example of how Alina may summarize a completed scan.'} action={<Link className="button button-secondary" to="/scan"><ArrowLeft size={16} /> Back to scan</Link>} /><div className="result-grid"><section className="panel result-summary-panel"><div className="section-kicker"><ShieldCheck size={15} /> DEMO RESULT · NOT A LIVE ANALYSIS</div><div className="result-summary"><div className="result-score"><strong>82</strong><span>sample score</span></div><div><h2>Your skin looks steady today.</h2><p>In this sample, hydration is higher than the previous check-in. Small changes can have many causes, so a scan is only one piece of the picture.</p><span className="confidence-note">Limited sample history · not medical advice</span></div></div><div className="result-actions"><Link className="button button-primary" to="/progress">See sample progress <ArrowRight size={16} /></Link><Link className="quiet-link" to="/chat">Ask about this result</Link></div></section><section className="panel metric-panel"><div className="section-heading"><div><p className="page-eyebrow">SUPPORTING SIGNALS</p><h2>Skin metrics</h2></div></div><div className="metric-grid">{metrics.map(({ label, value, delta, icon: Icon, tone }) => <div className="metric-card" key={label}><span className={`quick-icon ${tone}`}><Icon size={17} /></span><strong>{value}</strong><span>{label}</span><small className={delta.startsWith('+') ? 'positive' : ''}>{delta} vs. sample</small></div>)}</div></section><section className="panel result-next-panel"><div className="next-step-icon"><ScanFace size={18} /></div><div><p className="page-eyebrow">WHAT’S NEXT</p><h2>Keep your routine consistent.</h2><p>Try another check-in later to build a more useful personal timeline.</p></div><Link className="quiet-link" to="/recommendations">Explore sample care <ArrowRight size={15} /></Link></section></div></div>;
}
