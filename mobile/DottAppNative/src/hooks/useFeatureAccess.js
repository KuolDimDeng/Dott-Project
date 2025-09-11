import { useState, useEffect } from 'react';
import featureApi from '../services/featureApi';

/**
 * Hook to check if a user has access to a specific feature
 * @param {string} featureCode - The feature code to check
 * @returns {object} - { hasAccess, loading, error }
 */
export const useFeatureAccess = (featureCode) => {
  const [hasAccess, setHasAccess] = useState(true); // Default to true for better UX
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!featureCode) {
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const access = await featureApi.hasFeatureAccess(featureCode);
        setHasAccess(access);
      } catch (err) {
        console.error(`Error checking access for ${featureCode}:`, err);
        setError(err.message);
        // Default to allowing access on error for better UX
        setHasAccess(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [featureCode]);

  return { hasAccess, loading, error };
};

/**
 * Hook to get all enabled features for the current user
 * @returns {object} - { features, loading, error, refetch }
 */
export const useEnabledFeatures = () => {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeatures = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await featureApi.getEnabledFeatures(forceRefresh);
      setFeatures(data);
    } catch (err) {
      console.error('Error fetching enabled features:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  return { 
    features, 
    loading, 
    error, 
    refetch: () => fetchFeatures(true) 
  };
};

/**
 * Hook to check multiple features at once
 * @param {string[]} featureCodes - Array of feature codes to check
 * @returns {object} - Object with feature codes as keys and access status as values
 */
export const useMultipleFeatureAccess = (featureCodes) => {
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!featureCodes || featureCodes.length === 0) {
      setLoading(false);
      return;
    }

    const checkMultipleAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = {};
        
        // Check all features in parallel
        const checks = await Promise.all(
          featureCodes.map(code => 
            featureApi.hasFeatureAccess(code)
              .then(access => ({ code, access }))
              .catch(() => ({ code, access: true })) // Default to true on error
          )
        );
        
        checks.forEach(({ code, access }) => {
          results[code] = access;
        });
        
        setAccessMap(results);
      } catch (err) {
        console.error('Error checking multiple feature access:', err);
        setError(err.message);
        // Default all to true on error
        const defaultMap = {};
        featureCodes.forEach(code => {
          defaultMap[code] = true;
        });
        setAccessMap(defaultMap);
      } finally {
        setLoading(false);
      }
    };

    checkMultipleAccess();
  }, [JSON.stringify(featureCodes)]); // Use stringified array as dependency

  return { accessMap, loading, error };
};