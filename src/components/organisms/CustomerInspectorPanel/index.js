/**
 * CustomerInspectorPanel - SaaS-grade customer inspector with three modes
 * 
 * Components:
 * - CustomerInspectorPanel: Main panel (view/edit/create modes)
 * - InspectorSkeleton: Loading state that matches final layout
 * - InlineEditableField: Hover-to-edit field component
 * - CustomerCreateForm: Focused form for new customers
 * - DeleteConfirmationDialog: Calm confirmation for deletion
 * 
 * Usage:
 * ```jsx
 * // View/Edit mode
 * <CustomerInspectorPanel
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   customerId={selectedCustomerId}
 *   onSuccess={() => refetchCustomers()}
 * />
 * 
 * // Create mode
 * <CustomerInspectorPanel
 *   isOpen={isCreateOpen}
 *   onClose={() => setIsCreateOpen(false)}
 *   customerId={null}
 *   mode="create"
 *   onSuccess={(newCustomer) => handleNewCustomer(newCustomer)}
 * />
 * ```
 */

import CustomerInspectorPanel from './CustomerInspectorPanel';
import InspectorSkeleton from './InspectorSkeleton';
import InlineEditableField from './InlineEditableField';
import CustomerCreateForm from './CustomerCreateForm';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

export {
  CustomerInspectorPanel,
  InspectorSkeleton,
  InlineEditableField,
  CustomerCreateForm,
  DeleteConfirmationDialog,
};

export default CustomerInspectorPanel;
