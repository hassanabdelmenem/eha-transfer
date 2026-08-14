# Give a mock user
sed -i '' "s/const { user } = useAuth();/const user = { role: 'nurse', facilityId: 'test-fac', id: 'test-user', department: 'er' };/" src/pages/ReferralDetailPage.tsx
