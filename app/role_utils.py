# Role hierarchy utilities

ROLE_ORDER = ["admin", "recruiter", "candidate"]

def has_role(user_role: str, allowed_roles: list[str]) -> bool:
    """Return True if user_role is equal to or higher than any of allowed_roles according to ROLE_ORDER.
    Higher means earlier in the list.
    """
    if user_role not in ROLE_ORDER:
        return False
    user_index = ROLE_ORDER.index(user_role)
    for role in allowed_roles:
        if role not in ROLE_ORDER:
            continue
        if user_index <= ROLE_ORDER.index(role):
            return True
    return False
