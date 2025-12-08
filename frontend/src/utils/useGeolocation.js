import { useState, useEffect } from 'react';

const useGeolocation = (autoFetch = false) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Lỗi định vị:', err);
        setError(err.message || 'Không thể lấy vị trí');
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    if (autoFetch) fetchLocation();
  }, [autoFetch]);

  return { location, error, fetchLocation };
};

export default useGeolocation;