import DriverTripList from '../components/DriverTripList';

export default function TripHistoryPage() {
  return <DriverTripList
    title="Trip history"
    description="Review completed and declined bookings assigned to your driver account."
    statuses={['COMPLETED', 'DECLINED']}
    emptyTitle="No trip history yet"
    emptyDescription="Completed and declined trips will be recorded here."
    showActions={false}
  />;
}
