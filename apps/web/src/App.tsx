import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./modules/shop/pages/Home";
import Checkout from "./modules/shop/pages/Checkout";
import Dashboard from "./modules/admin/pages/Dashboard";
import Orders from "./modules/admin/pages/Orders";
import Products from "./modules/admin/pages/Products";
import Categories from "./modules/admin/pages/Categories";
import Settings from "./modules/admin/pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas do Cliente */}
        <Route path="/" element={<Home />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Rotas do Administrador */}
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
