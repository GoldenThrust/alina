
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, Check, ImagePlus, ScanFace, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import PageHeading from '../components/PageHeading';

export default function Scan() {
	const [fileName, setFileName] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const navigate = useNavigate();

	function handleFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setFileName(file.name);
		setPreviewUrl(URL.createObjectURL(file));
	}

	function continuePreview(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		navigate('/scan-result', { state: { fileName, previewOnly: true } });
	}

	return (
		<div className="page-content scan-page"><PageHeading eyebrow="A calm moment for you" title="Skin scan" description="Find soft, even light and bring your face into the guide. This screen is a preview; analysis is not connected yet." /><div className="scan-layout"><section className="panel scan-instructions"><div className="section-kicker"><ScanFace size={15} /> BEFORE YOU BEGIN</div><h2>Let’s get a clear starting point.</h2><p className="muted-copy">A few small things can help make a future scan more consistent.</p><ol className="scan-steps"><li><span>01</span><div><strong>Face the light</strong><small>Choose soft, even light and avoid strong shadows.</small></div></li><li><span>02</span><div><strong>Keep it natural</strong><small>Remove glasses and move hair away from your face.</small></div></li><li><span>03</span><div><strong>Stay centered</strong><small>Look toward the camera and keep your face inside the frame.</small></div></li></ol><div className="privacy-note"><ShieldCheck size={17} /><span><strong>Your image stays yours.</strong><small>This prototype does not upload or analyze selected images.</small></span></div></section><form className="panel capture-panel" onSubmit={continuePreview}><div className="capture-frame">{previewUrl ? <img src={previewUrl} alt="Selected scan preview" /> : <div className="face-guide"><span className="guide-corner top-left" /><span className="guide-corner top-right" /><span className="guide-corner bottom-left" /><span className="guide-corner bottom-right" /><div className="face-shape"><span className="face-eye left" /><span className="face-eye right" /><span className="face-smile" /></div><span className="frame-hint">CENTER YOUR FACE</span></div>}</div><div className="capture-status"><span className="status-dot muted" /> {fileName || 'Camera capture is planned for the next build slice'}</div><div className="capture-actions"><label className="button button-secondary upload-button"><ImagePlus size={16} /> Choose a photo<input type="file" accept="image/*" onChange={handleFile} /></label><button className="button button-primary" type="submit" disabled={!fileName}>Preview result <ArrowRight size={16} /></button></div>{fileName ? <p className="inline-confirm"><Check size={14} /> Image selected locally for preview only.</p> : <p className="small-note">Choose an image to preview the result layout. No skin analysis will run.</p>}</form></div></div>
	);
}
