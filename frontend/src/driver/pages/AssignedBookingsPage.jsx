import DriverTripList from '../components/DriverTripList';

export default function AssignedBookingsPage() {
  return <DriverTripList
    title="Assigned bookings"
    description="Review trip offers and confirmed upcoming trips assigned to you."
    statuses={['PENDING', 'ACCEPTED']}
    emptyTitle="No assigned bookings"
    emptyDescription="New confirmed bookings assigned by your Fleet Manager will appear here."
  />;
}
