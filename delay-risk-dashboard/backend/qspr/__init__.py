"""
QSPR/PAIMANA prediction subsystem.

Completely independent from the existing large land-acquisition-delay model:
own feature set, own model artifact, own history storage, own API routes.
Nothing in this package is imported by, or imports from, data_repo.py,
ml_engine.py, or any existing router.
"""
