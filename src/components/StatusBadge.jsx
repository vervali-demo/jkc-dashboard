import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CancelIcon from "@mui/icons-material/Cancel";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  let Icon = AccessTimeIcon;
  let className = "status-placed";

  if (normalizedStatus === "accepted") {
    Icon = CheckCircleIcon;
    className = "status-accepted";
  } else if (
    normalizedStatus === "fulfilled" ||
    normalizedStatus === "delivered"
  ) {
    Icon = TaskAltIcon;
    className = "status-fulfilled";
  } else if (normalizedStatus === "partial fulfilled") {
    Icon = DonutLargeIcon;
    className = "status-partial";
  } else if (normalizedStatus === "rejected") {
    Icon = CancelIcon;
    className = "status-rejected";
  } else if (normalizedStatus === "distributor edit") {
    Icon = EditNoteIcon;
    className = "status-distributor-edit";
  } else if (
    normalizedStatus === "placed" ||
    normalizedStatus === "pending" ||
    normalizedStatus === "new"
  ) {
    Icon = AccessTimeIcon;
    className = "status-placed";
  }

  return (
    <span className={`status-badge ${className}`}>
      <Icon fontSize="small" />
      {status || "Unknown"}
    </span>
  );
};

export default StatusBadge;
