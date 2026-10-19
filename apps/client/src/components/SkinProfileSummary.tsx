import { Hourglass, Palette, ScanFace, Sun } from "lucide-react";


interface Props {
  skinType?: ZoneTypes | null;
  skinAge?: number | null;
  /** Any valid CSS color, e.g. "#c68642" */
  skinTone?: string | null;
  /** Fitzpatrick type, e.g. "III" or 3 */
  fitzpatrick?: string | number | null;
}

const hasValue = (v: unknown) => v !== null && v !== undefined && v !== "";

const isValidColor = (v: string) =>
  typeof CSS !== "undefined" && CSS.supports("color", v);

export default function SkinProfileSummary({
  skinType = null,
  skinAge = null,
  skinTone = null,
  fitzpatrick = null,
}: Props) {
  const toneValid = !!skinTone && isValidColor(skinTone);

  return (
    <section className="skin-profile">
      {skinType && (
        <div className="skin-profile-tile skin-profile-wide">
          <span className="skin-profile-label">
            <ScanFace size={14} /> Skin type
          </span>
          <div className="skin-profile-zones">
            <span className="zone-chip zone-main">
              <small>Overall</small>
              <strong>{skinType.whole}</strong>
            </span>
            <span className="zone-chip">
              <small>T-zone</small>
              <strong>{skinType.t_zone}</strong>
            </span>
            <span className="zone-chip">
              <small>U-zone</small>
              <strong>{skinType.u_zone}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="skin-profile-tile">
        <span className="skin-profile-label">
          <Hourglass size={14} /> Skin age
        </span>
        <p className="skin-profile-value">
          {hasValue(skinAge) ? (
            <>
              {skinAge}
              <small> yrs</small>
            </>
          ) : (
            <span className="skin-profile-empty">—</span>
          )}
        </p>
      </div>

      <div className="skin-profile-tile">
        <span className="skin-profile-label">
          <Palette size={14} /> Skin tone
        </span>
        <div className="skin-profile-tone">
          <i
            className={`tone-swatch${toneValid ? "" : " empty"}`}
            style={toneValid ? { background: skinTone! } : undefined}
            aria-hidden="true"
          />
          <span className="skin-profile-tone-text">
            {hasValue(skinTone) ? skinTone : <span className="skin-profile-empty">—</span>}
          </span>
        </div>
      </div>

      <div className="skin-profile-tile">
        <span className="skin-profile-label">
          <Sun size={14} /> Fitzpatrick
        </span>
        <p className="skin-profile-value">
          {hasValue(fitzpatrick) ? (
            <span className="fitz-badge">{fitzpatrick}</span>
          ) : (
            <span className="skin-profile-empty">—</span>
          )}
        </p>
      </div>
    </section>
  );
}