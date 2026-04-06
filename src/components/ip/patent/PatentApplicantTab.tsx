import { useState } from 'react';
import { Edit3, Save, Loader2, Plus, Trash2, Users, MapPin, Briefcase, Building } from 'lucide-react';
import type {
  InventorInfo,
  CorrespondenceAddressInfo,
  AttorneyInfoData,
  PatentApplication,
  PatentApplicationWithDetails,
} from '../../../services/patent/patentApplicationService';

interface PatentApplicantTabProps {
  application: PatentApplicationWithDetails;
  onUpdate: (updates: Partial<PatentApplication>) => Promise<void>;
}

function newInventor(): InventorInfo {
  return {
    id: crypto.randomUUID(),
    fullName: '',
    residence: { city: '', state: '', country: 'US' },
    citizenship: 'US Citizen',
  };
}

export function PatentApplicantTab({ application, onUpdate }: PatentApplicantTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const existingInventors = application.inventors?.length
    ? application.inventors
    : application.inventor_name
      ? [{ id: '1', fullName: application.inventor_name, residence: { city: '', state: '', country: 'US' }, citizenship: application.inventor_citizenship || 'US Citizen' }]
      : [];

  const [inventors, setInventors] = useState<InventorInfo[]>(
    existingInventors.length > 0 ? existingInventors : [newInventor()]
  );
  const [correspondence, setCorrespondence] = useState<CorrespondenceAddressInfo>(
    application.correspondence_address || { name: '', street: '', city: '', state: '', zipCode: '', country: 'US', phone: '', email: '' }
  );
  const [attorney, setAttorney] = useState<AttorneyInfoData>(
    application.attorney_info || { name: '', registrationNumber: '', firm: '' }
  );
  const [entityStatus, setEntityStatus] = useState<string>(
    application.entity_status || 'micro_entity'
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        inventors,
        correspondence_address: correspondence,
        attorney_info: attorney,
        entity_status: entityStatus as PatentApplication['entity_status'],
        inventor_name: inventors[0]?.fullName || null,
        inventor_citizenship: inventors[0]?.citizenship || null,
      } as Partial<PatentApplication>);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const updateInventor = (idx: number, field: string, value: string) => {
    setInventors(prev => prev.map((inv, i) => {
      if (i !== idx) return inv;
      if (field.startsWith('residence.')) {
        const key = field.split('.')[1];
        return { ...inv, residence: { ...inv.residence, [key]: value } };
      }
      if (field.startsWith('mailingAddress.')) {
        const key = field.split('.')[1];
        return { ...inv, mailingAddress: { ...inv.mailingAddress, street: '', city: '', state: '', zipCode: '', country: 'US', ...inv.mailingAddress, [key]: value } };
      }
      return { ...inv, [field]: value };
    }));
  };

  const addInventor = () => setInventors(prev => [...prev, newInventor()]);
  const removeInventor = (idx: number) => setInventors(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Applicant Information</h2>
            <p className="text-xs text-gray-500 mt-0.5">Inventor, correspondence, and entity details for USPTO filing</p>
          </div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {/* Entity Status */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <Building className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Entity Status</h3>
        </div>
        {editing ? (
          <select
            value={entityStatus}
            onChange={(e) => setEntityStatus(e.target.value)}
            className="w-full max-w-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="micro_entity">Micro Entity (lowest fees)</option>
            <option value="small_entity">Small Entity (reduced fees)</option>
            <option value="regular">Regular / Large Entity</option>
          </select>
        ) : (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            {entityStatus === 'micro_entity' ? 'Micro Entity' : entityStatus === 'small_entity' ? 'Small Entity' : 'Regular Entity'}
          </span>
        )}
      </div>

      {/* Inventors */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Inventors</h3>
            <span className="text-xs text-gray-400">({inventors.length})</span>
          </div>
          {editing && (
            <button onClick={addInventor} className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Inventor
            </button>
          )}
        </div>

        <div className="space-y-4">
          {inventors.map((inv, idx) => (
            <div key={inv.id} className={`border rounded-xl p-4 ${editing ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100'}`}>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inventor {idx + 1}</span>
                    {inventors.length > 1 && (
                      <button onClick={() => removeInventor(idx)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Full Legal Name *</label>
                      <input type="text" value={inv.fullName} onChange={(e) => updateInventor(idx, 'fullName', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="First Middle Last" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Citizenship</label>
                      <input type="text" value={inv.citizenship} onChange={(e) => updateInventor(idx, 'citizenship', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="US Citizen" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">City of Residence</label>
                      <input type="text" value={inv.residence.city} onChange={(e) => updateInventor(idx, 'residence.city', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                      <input type="text" value={inv.residence.state} onChange={(e) => updateInventor(idx, 'residence.state', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                      <input type="text" value={inv.residence.country} onChange={(e) => updateInventor(idx, 'residence.country', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.fullName || 'Unnamed Inventor'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[inv.citizenship, [inv.residence.city, inv.residence.state, inv.residence.country].filter(Boolean).join(', ')].filter(Boolean).join(' — ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Correspondence Address */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <MapPin className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Correspondence Address</h3>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name / Firm</label>
              <input type="text" value={correspondence.name || ''} onChange={(e) => setCorrespondence(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Street Address</label>
              <input type="text" value={correspondence.street} onChange={(e) => setCorrespondence(p => ({ ...p, street: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
              <input type="text" value={correspondence.city} onChange={(e) => setCorrespondence(p => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
              <input type="text" value={correspondence.state} onChange={(e) => setCorrespondence(p => ({ ...p, state: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ZIP Code</label>
              <input type="text" value={correspondence.zipCode} onChange={(e) => setCorrespondence(p => ({ ...p, zipCode: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <input type="text" value={correspondence.country} onChange={(e) => setCorrespondence(p => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input type="text" value={correspondence.phone || ''} onChange={(e) => setCorrespondence(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="text" value={correspondence.email || ''} onChange={(e) => setCorrespondence(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 space-y-0.5">
            {correspondence.name && <p className="font-medium">{correspondence.name}</p>}
            {correspondence.street ? (
              <>
                <p>{correspondence.street}</p>
                <p>{[correspondence.city, correspondence.state, correspondence.zipCode].filter(Boolean).join(', ')} {correspondence.country}</p>
                {correspondence.phone && <p className="text-gray-500 text-xs mt-1">Phone: {correspondence.phone}</p>}
                {correspondence.email && <p className="text-gray-500 text-xs">Email: {correspondence.email}</p>}
              </>
            ) : (
              <p className="text-gray-400 italic text-xs">No correspondence address set. Click Edit to add.</p>
            )}
          </div>
        )}
      </div>

      {/* Attorney / Agent */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <Briefcase className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Attorney / Agent (Optional)</h3>
        </div>
        {editing ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input type="text" value={attorney.name || ''} onChange={(e) => setAttorney(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Registration Number</label>
              <input type="text" value={attorney.registrationNumber || ''} onChange={(e) => setAttorney(p => ({ ...p, registrationNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Firm</label>
              <input type="text" value={attorney.firm || ''} onChange={(e) => setAttorney(p => ({ ...p, firm: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700">
            {attorney.name ? (
              <p>{attorney.name}{attorney.registrationNumber ? ` (Reg. #${attorney.registrationNumber})` : ''}{attorney.firm ? ` — ${attorney.firm}` : ''}</p>
            ) : (
              <p className="text-gray-400 italic text-xs">No attorney/agent specified. Click Edit to add.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
