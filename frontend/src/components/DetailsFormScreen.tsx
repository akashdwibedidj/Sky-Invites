import React, { useRef } from 'react';
import { ArrowRight, Calendar, ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { EventDate, ReferencePhoto } from '../types/invitation';

export const DetailsFormScreen: React.FC = () => {
  const { activeInvitation, updateActiveDetails, navigateTo } = useInvitations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeInvitation) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-600">No active invitation selected.</p>
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[#B88B58] text-white text-sm font-medium cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { type, details } = activeInvitation;
  const isCoupleEvent = type === 'Wedding' || type === 'Engagement' || type === 'Anniversary';

  const handleAddEvent = () => {
    const newEvent: EventDate = {
      id: `ev-${Date.now()}`,
      name: '',
      date: '',
      time: '',
      venue: '',
    };
    updateActiveDetails({ events: [...details.events, newEvent] });
  };

  const handleUpdateEvent = (id: string, patch: Partial<EventDate>) => {
    updateActiveDetails({
      events: details.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    });
  };

  const handleRemoveEvent = (id: string) => {
    updateActiveDetails({
      events: details.events.filter((ev) => ev.id !== id),
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newPhoto: ReferencePhoto = {
            id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            url: reader.result,
          };
          updateActiveDetails({
            referencePhotos: [...details.referencePhotos, newPhoto],
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (id: string) => {
    updateActiveDetails({
      referencePhotos: details.referencePhotos.filter((p) => p.id !== id),
    });
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#A27644] mb-2">
            Stage 1 · {type} Details
          </p>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
            Names, Events & Wording
          </h1>
          <p className="mt-1.5 text-sm text-stone-600">
            All fields are optional—fill in what you have today and refine any line later in Image Review.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('create-type')}
          className="text-xs font-medium text-stone-600 hover:text-stone-900 underline underline-offset-4 self-start sm:self-auto cursor-pointer"
        >
          Change Occasion ({type})
        </button>
      </div>

      <div className="space-y-8">
        {/* Card 1: Names & Hosts */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.02)]">
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
            {isCoupleEvent ? 'Couple & Family Names' : 'Honoree & Host Details'}
          </h2>
          <p className="text-xs text-stone-500 mb-6">
            Used to personalize opening headlines, blessings, and RSVP signatures.
          </p>

          {isCoupleEvent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  {type === 'Anniversary' ? 'Partner One Name' : 'Groom Name'}
                </label>
                <input
                  type="text"
                  value={details.groomName}
                  onChange={(e) => updateActiveDetails({ groomName: e.target.value })}
                  placeholder="e.g., Aarav Singhania"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  {type === 'Anniversary' ? 'Partner Two Name' : 'Bride Name'}
                </label>
                <input
                  type="text"
                  value={details.brideName}
                  onChange={(e) => updateActiveDetails({ brideName: e.target.value })}
                  placeholder="e.g., Meera Kapoor"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Groom&apos;s Parents (optional)
                </label>
                <input
                  type="text"
                  value={details.groomParents}
                  onChange={(e) => updateActiveDetails({ groomParents: e.target.value })}
                  placeholder="e.g., Mrs. Kavita & Mr. Rajesh Singhania"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Bride&apos;s Parents (optional)
                </label>
                <input
                  type="text"
                  value={details.brideParents}
                  onChange={(e) => updateActiveDetails({ brideParents: e.target.value })}
                  placeholder="e.g., Mrs. Sunita & Mr. Vikram Kapoor"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  {type === 'Corporate' ? 'Event or Brand Title' : 'Honoree / Guest of Honor'}
                </label>
                <input
                  type="text"
                  value={details.honoreeName}
                  onChange={(e) => updateActiveDetails({ honoreeName: e.target.value })}
                  placeholder={
                    type === 'Birthday'
                      ? 'e.g., Kabir Mehta'
                      : type === 'Baby Shower'
                        ? 'e.g., Maya & Arjun'
                        : 'e.g., Atelier Winter Gala'
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Hosted By (optional)
                </label>
                <input
                  type="text"
                  value={details.hostName}
                  onChange={(e) => updateActiveDetails({ hostName: e.target.value })}
                  placeholder="e.g., The Mehta Family"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
                />
              </div>
            </div>
          )}
        </section>

        {/* Card 2: Dynamic Events & Dates List */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.02)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#B88B58]" />
                <span>Events & Dates</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Add each ceremony, dinner, or celebration you want featured in the invitation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddEvent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#8F6534] bg-[#FAF6EE] hover:bg-[#F3EBD9] border border-[#E5D5BA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event Row</span>
            </button>
          </div>

          {details.events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 py-8 px-4 text-center">
              <p className="text-sm text-stone-600">No events added yet.</p>
              <button
                type="button"
                onClick={handleAddEvent}
                className="mt-3 text-xs font-medium text-[#9A6F3D] hover:underline cursor-pointer"
              >
                + Add your first ceremony or event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {details.events.map((ev, index) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-stone-200/90 bg-[#FAF9F6] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-500 tabular-nums">
                      Event {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvent(ev.id)}
                      aria-label={`Remove event ${index + 1}`}
                      className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Event Name
                      </label>
                      <input
                        type="text"
                        value={ev.name}
                        onChange={(e) => handleUpdateEvent(ev.id, { name: e.target.value })}
                        placeholder="e.g., Sangeet Under the Stars"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={ev.date}
                        onChange={(e) => handleUpdateEvent(ev.id, { date: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-stone-900 tabular-nums focus:outline-none focus:border-[#B88B58]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Time
                      </label>
                      <input
                        type="text"
                        value={ev.time}
                        onChange={(e) => handleUpdateEvent(ev.id, { time: e.target.value })}
                        placeholder="07:30 PM"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-stone-900 tabular-nums focus:outline-none focus:border-[#B88B58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Venue / Address
                    </label>
                    <input
                      type="text"
                      value={ev.venue}
                      onChange={(e) => handleUpdateEvent(ev.id, { venue: e.target.value })}
                      placeholder="e.g., Jagmandir Island Palace, Udaipur"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Card 3: Invitation Message & Reference Photos */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.02)] space-y-6">
          <div>
            <label
              htmlFor="invitation-message"
              className="block font-serif text-xl font-semibold text-stone-900 mb-1"
            >
              Invitation Message & Notes
            </label>
            <p className="text-xs text-stone-500 mb-3">
              Share your heartfelt greeting, dress code notes, or visual inspiration for our AI writer.
            </p>
            <textarea
              id="invitation-message"
              rows={4}
              value={details.message}
              onChange={(e) => updateActiveDetails({ message: e.target.value })}
              placeholder="With the blessings of our elders, we joyfully invite you to share in our celebrations..."
              className="w-full px-3.5 py-3 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-[#B88B58]" />
                  <span>Reference or Physical Invitation Photo(s)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Upload printed stationery, moodboard cards, or venue photos to inspire the artwork.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              className="mt-2 rounded-xl border border-dashed border-stone-300 bg-[#FAF9F6] hover:bg-[#FAF6EE] hover:border-[#B88B58] transition-colors py-7 px-4 text-center cursor-pointer"
            >
              <Upload className="w-5 h-5 text-[#B88B58] mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-800">
                Click to upload or drag & drop reference images
              </p>
              <p className="text-xs text-stone-500 mt-1">
                PNG, JPG, or WEBP · Optional
              </p>
            </div>

            {details.referencePhotos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {details.referencePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden border border-stone-200 aspect-[3/4] bg-stone-100"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      aria-label={`Remove ${photo.name}`}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-stone-700 hover:text-rose-600 shadow-sm flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Save & Return Later
          </button>

          <button
            type="button"
            onClick={() => navigateTo('step-2-design')}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#B88B58] hover:bg-[#A27644] rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <span>Continue to Design Preferences</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
};
