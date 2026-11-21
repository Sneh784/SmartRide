import DriverTripList from '../components/DriverTripList';

export default function ActiveTripsPage() {
  return <DriverTripList
    title="Active trips"
    description="View active customer trips, contact details, and directions for each stop."
    statuses={['IN_PROGRESS']}
    emptyTitle="No active trips"
    emptyDescription="Accepted trips will appear here after you start them."
  />;
}
