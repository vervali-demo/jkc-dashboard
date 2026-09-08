import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CancelIcon from "@mui/icons-material/Cancel";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import FiberNewIcon from "@mui/icons-material/FiberNew";

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || "").toLowerCase();

  let Icon = AccessTimeIcon;
  let className = "status-pending";

  if (normalizedStatus === "accepted") {
    Icon = CheckCircleIcon;
    className = "status-accepted";
  } else if (normalizedStatus === "delivered") {
    Icon = CheckCircleIcon;
    className = "status-delivered";
  } else if (normalizedStatus === "rejected") {
    Icon = CancelIcon;
    className = "status-rejected";
  } else if (normalizedStatus === "dispatched") {
    Icon = LocalShippingIcon;
    className = "status-dispatched";
  } else if (normalizedStatus === "new") {
    Icon = FiberNewIcon;
    className = "status-new";
  } else if (normalizedStatus === "pending") {
    Icon = AccessTimeIcon;
    className = "status-pending";
  }

  return (
    <span className={`status-badge ${className}`}>
      <Icon fontSize="small" />
      {status || "Unknown"}
    </span>
  );
};

export default StatusBadge;