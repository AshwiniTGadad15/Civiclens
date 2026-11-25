import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, MapPin, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { REPORT_SUBCATEGORIES } from '../lib/constants';
import type { CivicCategory, CivicIssue, IssueSeverity } from '../types/civic';
import { CivicMap } from '../components/maps/CivicMap';

interface UploadedPhoto {
  url: string;
  caption: string;
  name: string;
}

const STEP_LABELS = ['1. Category', '2. Details', '3. Location', '4. Evidence', '5. Review & Submit'];

export function ReportIssuePage() {
  const { user, locations, selectedLocation, refreshStats } = useApp();
  const [step, setStep] = useState(1);

  // Step 1
  const [subCategory, setSubCategory] = useState(REPORT_SUBCATEGORIES[0].label);
  const [category, setCategory] = useState<CivicCategory>(REPORT_SUBCATEGORIES[0].category);

  // Step 2
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [observedDate, setObservedDate] = useState(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Step 3
  const defaultLoc = selectedLocation || locations[0];
  const [locationSlug, setLocationSlug] = useState(defaultLoc?.slug || 'indiranagar-bengaluru');
  const [state, setState] = useState(defaultLoc?.state || 'Karnataka');
  const [district, setDistrict] = useState(defaultLoc?.district || 'Bengaluru Urban');
  const [city, setCity] = useState(defaultLoc?.city || 'Bengaluru');
  const [locality, setLocality] = useState(defaultLoc?.name || 'Indiranagar');
  const [pinCode, setPinCode] = useState(defaultLoc?.pinCode || '560038');
  const [coords, setCoords] = useState({
    lat: defaultLoc?.latitude ?? 12.9784,
    lng: defaultLoc?.longitude ?? 77.6408,
  });

  // Step 4
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdIssue, setCreatedIssue] = useState<CivicIssue | null>(null);

  const handleSelectPresetLocation = (slug: string) => {
    setLocationSlug(slug);
    const match = locations.find((l) => l.slug === slug);
    if (match) {
      setState(match.state);
      setDistrict(match.district);
      setCity(match.city);
      setLocality(match.name);
      setPinCode(match.pinCode || '');
      setCoords({ lat: match.latitude, lng: match.longitude });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 4) {
      setUploadError('You can attach up to 4 evidence photographs per report.');
      return;
    }

    files.forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setUploadError('Only JPEG, PNG, and WebP images are accepted.');
        return;
      }
      if (file.size > 4.5 * 1024 * 1024) {
        setUploadError(`${file.name} exceeds the 4.5 MB file size limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, { url: reader.result as string, caption: '', name: file.name }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const canProceed = () => {
    if (step === 2) {
      return title.trim().length >= 6 && description.trim().length >= 20;
    }
    if (step === 3) {
      return state.trim().length >= 2 && city.trim().length >= 2 && locality.trim().length >= 2;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      setSubmitError('Please sign in or create a free citizen account to submit a verified report.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await api.createIssue({
        title: title.trim(),
        description: description.trim(),
        category,
        subCategory,
        severity,
        observedDate,
        additionalNotes: additionalNotes.trim() || undefined,
        state: state.trim(),
        district: district.trim() || city.trim(),
        city: city.trim(),
        locality: locality.trim(),
        locationSlug,
        pinCode: pinCode.trim() || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        media: photos.map((p) => ({ url: p.url, caption: p.caption.trim() || undefined })),
      });
      setCreatedIssue(created);
      await refreshStats();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit issue report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdIssue) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-[#19C98A]/50 bg-[#102338] p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#19C98A]" />
          <h1 className="mt-4 font-display text-2xl font-bold text-[#F4F8FC]">Civic Issue Report Recorded</h1>
          <p className="mt-2 text-sm text-[#9AABBB]">
            Your civic observation has been saved to CivicLens with a unique tracking identifier.
          </p>

          <div className="mt-6 rounded-xl border border-[#20364A] bg-[#0B1929] p-4">
            <div className="text-xs text-[#9AABBB]">Unique CivicLens Tracking ID</div>
            <div className="mt-1 font-mono text-2xl font-bold text-[#48E6B0]">{createdIssue.trackingId}</div>
            <div className="mt-2 text-xs text-[#9AABBB]">
              Status: {createdIssue.status} · Data Label: {createdIssue.dataOrigin}
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-[#9AABBB]">
            Transparency notice: CivicLens does not claim automatic filing with a government department without an
            authorized official integration. Use our Government Directory to also submit an official municipal docket.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to={`/issues/${createdIssue.id}`}
              className="rounded-lg bg-[#19C98A] px-5 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0]"
            >
              Track This Issue
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-[#20364A] bg-[#0B1929] px-5 py-2.5 text-xs font-semibold text-[#F4F8FC] hover:border-[#19C98A]"
            >
              View in Citizen Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#20364A] pb-6">
        <h1 className="font-display text-3xl font-bold text-[#F4F8FC]">Report a Civic Problem</h1>
        <p className="mt-1.5 text-sm text-[#9AABBB]">
          Document local infrastructure issues accurately with location coordinates and photographic evidence.
        </p>

        {!user && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-xs text-[#F4F8FC]">
            <span>You can prepare your report now, and sign in before final submission to receive a tracking ID.</span>
            <Link to="/login" className="font-semibold text-[#19C98A] hover:underline whitespace-nowrap">
              Sign In / Create Account →
            </Link>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="mt-6 grid grid-cols-5 gap-2">
        {STEP_LABELS.map((label, idx) => {
          const num = idx + 1;
          const active = num === step;
          const done = num < step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => num < step && setStep(num)}
              className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
                active
                  ? 'border-[#19C98A] bg-[#19C98A]/15 text-[#48E6B0]'
                  : done
                    ? 'border-[#20364A] bg-[#102338] text-[#F4F8FC]'
                    : 'border-[#20364A] bg-[#0B1929] text-[#9AABBB]'
              }`}
            >
              <span className="truncate block">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Body */}
      <div className="mt-6 rounded-2xl border border-[#20364A] bg-[#102338] p-6 sm:p-8">
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#F4F8FC]">Step 1: Select Issue Category</h2>
            <p className="mt-1 text-xs text-[#9AABBB]">Choose the category that best describes the civic problem.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {REPORT_SUBCATEGORIES.map((item) => {
                const selected = subCategory === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSubCategory(item.label);
                      setCategory(item.category);
                    }}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#19C98A] bg-[#142B40] text-[#F4F8FC]'
                        : 'border-[#20364A] bg-[#0B1929] text-[#9AABBB] hover:border-[#2e4c66] hover:text-[#F4F8FC]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#F4F8FC]">{item.label}</div>
                    <div className="mt-1 text-xs text-[#9AABBB]">{item.category}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-[#F4F8FC]">Step 2: Describe the Problem</h2>

            <div>
              <label htmlFor="issue-title" className="block text-xs font-medium text-[#9AABBB] mb-1.5">
                Issue Title (minimum 6 characters) *
              </label>
              <input
                id="issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Collapsed stormwater drain slab near 12th Main Bus Stop"
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="issue-desc" className="block text-xs font-medium text-[#9AABBB] mb-1.5">
                Detailed Description (minimum 20 characters) *
              </label>
              <textarea
                id="issue-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe exact landmarks, how long the problem has persisted, and how it affects pedestrians or residents..."
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC] focus:border-[#19C98A] focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="issue-date" className="block text-xs font-medium text-[#9AABBB] mb-1.5">
                  Date Observed *
                </label>
                <input
                  id="issue-date"
                  type="date"
                  value={observedDate}
                  onChange={(e) => setObservedDate(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
                />
              </div>

              <div>
                <label htmlFor="issue-severity" className="block text-xs font-medium text-[#9AABBB] mb-1.5">
                  Severity Level *
                </label>
                <select
                  id="issue-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
                >
                  <option value="low">Low — Minor inconvenience</option>
                  <option value="medium">Medium — Affects daily utility or commute</option>
                  <option value="high">High — Significant disruption or recurring hazard</option>
                  <option value="critical">Critical — Immediate public safety risk</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="issue-notes" className="block text-xs font-medium text-[#9AABBB] mb-1.5">
                Optional Additional Information (Ward number, pole ID, or official docket if already filed)
              </label>
              <input
                id="issue-notes"
                type="text"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Optional landmark or reference"
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-[#F4F8FC]">Step 3: Location &amp; Map Pin</h2>
            <p className="text-xs text-[#9AABBB]">
              Select a locality preset, enter exact address details, and click directly on the map to place the issue
              pin.
            </p>

            <div>
              <label htmlFor="preset-loc" className="block text-xs font-medium text-[#9AABBB] mb-1.5">
                Quick Select Indexed Locality
              </label>
              <select
                id="preset-loc"
                value={locationSlug}
                onChange={(e) => handleSelectPresetLocation(e.target.value)}
                className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3.5 py-2.5 text-sm text-[#F4F8FC]"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.slug}>
                    {loc.name}, {loc.city}, {loc.state} {loc.pinCode ? `(${loc.pinCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Locality / Ward *</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-sm text-[#F4F8FC]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">PIN Code (6 digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="560038"
                  className="w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 font-mono text-sm text-[#F4F8FC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Latitude</label>
                <input
                  type="text"
                  readOnly
                  value={coords.lat}
                  className="w-full rounded-lg border border-[#20364A] bg-[#07111F] px-3 py-2 font-mono text-sm text-[#9AABBB]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9AABBB] mb-1">Longitude</label>
                <input
                  type="text"
                  readOnly
                  value={coords.lng}
                  className="w-full rounded-lg border border-[#20364A] bg-[#07111F] px-3 py-2 font-mono text-sm text-[#9AABBB]"
                />
              </div>
            </div>

            <CivicMap
              center={[coords.lng, coords.lat]}
              zoom={14}
              heightClass="h-72"
              interactivePinMode
              selectedPin={coords}
              onPinSelect={(c) => setCoords(c)}
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#F4F8FC]">Step 4: Upload Evidence</h2>
            <p className="mt-1 text-xs text-[#9AABBB]">
              Attach up to 4 JPEG, PNG, or WebP photographs (max 4.5 MB each). Avoid uploading personal license plates or
              private faces.
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#20364A] bg-[#0B1929] p-8 transition-colors hover:border-[#19C98A]">
              <Upload className="h-7 w-7 text-[#19C98A]" />
              <span className="mt-2 text-sm font-medium text-[#F4F8FC]">Click to select photographs</span>
              <span className="mt-1 text-xs text-[#9AABBB]">JPEG, PNG, WebP · Validated before upload</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            {uploadError && <p className="mt-3 text-xs text-[#FB7185]">{uploadError}</p>}

            {photos.length > 0 && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="overflow-hidden rounded-xl border border-[#20364A] bg-[#0B1929]">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      className="h-40 w-full object-cover"
                    />
                    <div className="flex items-center gap-2 p-2.5">
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) =>
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, caption: e.target.value } : p))
                          )
                        }
                        placeholder="Add short caption..."
                        className="w-full rounded border border-[#20364A] bg-[#102338] px-2.5 py-1.5 text-xs text-[#F4F8FC]"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded p-1.5 text-[#FB7185] hover:bg-[#142B40]"
                        aria-label="Remove image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-[#F4F8FC]">Step 5: Review &amp; Submit</h2>

            <div className="divide-y divide-[#20364A] rounded-xl border border-[#20364A] bg-[#0B1929] p-5 text-sm">
              <div className="pb-3">
                <div className="text-xs text-[#9AABBB]">Category</div>
                <div className="font-semibold text-[#F4F8FC]">
                  {subCategory} ({category}) · Severity: {severity}
                </div>
              </div>
              <div className="py-3">
                <div className="text-xs text-[#9AABBB]">Problem Summary</div>
                <div className="font-semibold text-[#F4F8FC]">{title}</div>
                <p className="mt-1 text-xs text-[#9AABBB]">{description}</p>
              </div>
              <div className="py-3">
                <div className="text-xs text-[#9AABBB]">Location</div>
                <div className="flex items-center gap-1.5 text-[#F4F8FC]">
                  <MapPin className="h-4 w-4 text-[#19C98A]" />
                  <span>
                    {locality}, {city}, {district}, {state} {pinCode ? `— ${pinCode}` : ''}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs text-[#9AABBB]">
                  Coordinates: {coords.lat}, {coords.lng} · Observed: {observedDate}
                </div>
              </div>
              <div className="pt-3">
                <div className="text-xs text-[#9AABBB]">Evidence Attached</div>
                <div className="text-xs text-[#F4F8FC]">{photos.length} photograph(s) ready</div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-[#FB7185]/40 bg-[#FB7185]/10 p-3 text-xs text-[#FB7185]">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-[#20364A] pt-5">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#20364A] bg-[#0B1929] px-4 py-2 text-xs font-semibold text-[#F4F8FC] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#19C98A] px-5 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] disabled:opacity-40"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-[#19C98A] px-6 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] disabled:opacity-50"
            >
              {submitting ? 'Submitting Report...' : 'Submit Civic Report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
