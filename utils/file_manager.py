import io
import os


def get_buffer_and_cleanup(filepath: str) -> io.BytesIO:
    """
    Read a file into a BytesIO buffer and delete the original file from disk.
    
    Args:
        filepath: The absolute or relative path to the file to be read and deleted.
        
    Returns:
        A BytesIO object containing the file's binary data, with the cursor 
        positioned at the beginning.
    """
    with open(filepath, 'rb') as file_handle:
        buffer = io.BytesIO(file_handle.read())
        
    buffer.seek(0)
    
    # Attempt deletion directly to avoid Time-of-Check to Time-of-Use (TOCTOU) race conditions.
    # FileNotFoundError is a subclass of OSError and will be safely ignored if the file is missing.
    try:
        os.unlink(filepath)
    except OSError:
        pass
        
    return buffer