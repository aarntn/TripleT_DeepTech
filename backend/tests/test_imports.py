def test_sklearn_importable():
    import sklearn
    assert sklearn.__version__.startswith("1.5")

def test_joblib_importable():
    import joblib
    assert joblib.__version__ is not None
