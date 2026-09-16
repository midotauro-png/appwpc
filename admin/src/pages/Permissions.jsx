import { useEffect, useState } from 'react';

import { supabase } from '../supabase';

const LEVELS = ['free', 'bronze', 'silver', 'golden'];

const Permissions = () => {
  const [features, setFeatures] = useState([]);
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [featureRows, levelRows] = await Promise.all([
      supabase.from('feature_permissions').select('*').order('feature_key'),
      supabase.from('membership_levels').select('*').order('rank'),
    ]);
    if (featureRows.error) setError(featureRows.error.message);
    setFeatures(featureRows.data ?? []);
    setLevels(levelRows.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const patchFeature = async (key, changes) => {
    setFeatures((current) =>
      current.map((row) => (row.feature_key === key ? { ...row, ...changes } : row))
    );
    const { error: updateError } = await supabase
      .from('feature_permissions')
      .update(changes)
      .eq('feature_key', key);
    if (updateError) {
      setError(updateError.message);
      load();
    }
  };

  const patchLevel = async (key, changes) => {
    setLevels((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    const { error: updateError } = await supabase
      .from('membership_levels')
      .update(changes)
      .eq('key', key);
    if (updateError) {
      setError(updateError.message);
      load();
    }
  };

  return (
    <>
      <h1>Permissions</h1>
      <p className="muted">
        Changes apply immediately in the app and are enforced by the database — no new app release
        is needed.
      </p>
      {error && <p className="error">{error}</p>}

      <h2>Feature access</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Minimum level</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.feature_key}>
                <td>
                  <strong>{feature.label}</strong>
                  <div className="muted">{feature.feature_key}</div>
                </td>
                <td style={{ width: 180 }}>
                  <select
                    value={feature.min_level}
                    onChange={(event) =>
                      patchFeature(feature.feature_key, { min_level: event.target.value })
                    }
                  >
                    {LEVELS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ width: 90 }}>
                  <input
                    type="checkbox"
                    style={{ width: 18 }}
                    checked={feature.is_enabled}
                    onChange={(event) =>
                      patchFeature(feature.feature_key, { is_enabled: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Membership levels</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Price label</th>
              <th>Benefits (one per line)</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level.key}>
                <td>
                  <span className={`badge ${level.key}`}>{level.name}</span>
                </td>
                <td style={{ width: 180 }}>
                  <input
                    value={level.price_label ?? ''}
                    onChange={(event) => patchLevel(level.key, { price_label: event.target.value })}
                  />
                </td>
                <td>
                  <textarea
                    rows={Math.max(3, (level.benefits ?? []).length)}
                    value={(level.benefits ?? []).join('\n')}
                    onChange={(event) =>
                      patchLevel(level.key, {
                        benefits: event.target.value.split('\n').filter(Boolean),
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Permissions;
