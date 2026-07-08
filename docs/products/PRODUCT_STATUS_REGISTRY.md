# Product Status Registry

- `draft`: not public and not purchasable.
- `live`: public and purchasable.
- `hidden`: not public and not purchasable, but restorable.
- `revoked`: intentionally disabled; checkout is blocked.
- `archived`: retained for history only.

Revoking a product blocks future checkout. It does not delete Stripe history or erase prior customer entitlement records.
