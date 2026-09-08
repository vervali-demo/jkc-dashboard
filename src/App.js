import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import OrderDashboard from "./pages/OrderDashboard";
import OrderDetails from "./pages/OrderDetails";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/orders"
          element={<OrderDashboard />}
        />

        <Route
          path="/orders/:id"
          element={<OrderDetails />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/orders"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;