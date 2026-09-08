const OrderStatCard = ({ title, value, percentage, icon, type }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>{icon}</div>

      <div className="stat-content">
        <p>{title}</p>
        <h2>{value}</h2>
        <span className="stat-growth">↑ {percentage}% from previous period</span>
      </div>
    </div>
  );
};

export default OrderStatCard;