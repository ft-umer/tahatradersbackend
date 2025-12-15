import Customer from '../models/Customer.js'; // match the exact filename

// GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/customers
export const createCustomer = async (req, res) => {
  const { name, phone, address } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and Phone are required' });
  }

  try {
    const newCustomer = new Customer({ name, phone, address });
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create customer' });
  }
};

// PUT /api/customers/:id
export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and Phone are required' });
  }

  try {
    const customer = await Customer.findByIdAndUpdate(
      id,
      { name, phone, address },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update customer' });
  }
};

// DELETE /api/customers/:id
export const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
};
