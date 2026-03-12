import os
import argparse
import subprocess
import tempfile

def merge_videos_ffmpeg(input_files, output_file):
    """
    Merges multiple video files into a single video file using FFmpeg's concat demuxer.
    This method is extremely fast and doesn't reduce quality, as it does not re-encode 
    the videos. It requires that all videos have the same resolution, frame rate, 
    and encoding (which they should if they're all generated from Gemini/Veo).
    
    Args:
        input_files (list): List of paths to the video files to merge in order.
        output_file (str): Path to save the merged video.
    """
    # Verify FFmpeg is installed
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: FFmpeg is not installed or not found in system PATH.")
        print("Please install FFmpeg to use this script (e.g., 'winget install ffmpeg' on Windows, or 'brew install ffmpeg' on Mac).")
        return

    # Verify all files exist
    valid_files = []
    for f in input_files:
        if not os.path.exists(f):
            print(f"Warning: File not found: {f}")
        else:
            # Get absolute path and format it nicely for FFmpeg list file
            abs_path = os.path.abspath(f)
            # Escape single quotes in path if any, though standard paths shouldn't have them
            abs_path = abs_path.replace("'", "'\\''") 
            valid_files.append(abs_path)
            
    if not valid_files:
        print("Error: No valid input files found to merge.")
        return

    print(f"Preparing to merge {len(valid_files)} videos using FFmpeg...")
    
    list_file_path = None
    try:
        # Create a temporary file to hold the list of video files
        # using delete=False because we need FFmpeg to read it
        fd, list_file_path = tempfile.mkstemp(suffix=".txt", text=True)
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            for video_file in valid_files:
                # FFmpeg concat demuxer syntax: file 'path/to/file.mp4'
                f.write(f"file '{video_file}'\n")

        # FFmpeg command string
        # -f concat: Use the concat demuxer
        # -safe 0: Allow absolute file paths
        # -i lists.txt: Input list file
        # -c copy: Copy the streams (video/audio) without re-encoding (super fast)
        command = [
            "ffmpeg",
            "-y", # Overwrite output file if it exists
            "-f", "concat",
            "-safe", "0",
            "-i", list_file_path,
            "-c", "copy",
            output_file
        ]
        
        print(f"Executing: {' '.join(command)}")
        print("Merging...")
        
        # Run FFmpeg
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode == 0:
            print(f"Successfully created: {output_file}")
        else:
            print("FFmpeg encountered an error. Printing error log:")
            print("--------------------------------------------------")
            print(result.stderr)
            print("--------------------------------------------------")
            print("Note: If the clips have different codecs, resolutions, or framerates, the 'copy' codec may fail.")
            print("In that case, try changing '-c', 'copy' in the script to '-vcodec', 'libx264', '-acodec', 'aac'.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Clean up the temporary list file
        if list_file_path and os.path.exists(list_file_path):
            try:
                os.remove(list_file_path)
            except Exception as cleanup_error:
                print(f"Warning: Could not delete temporary file {list_file_path}: {cleanup_error}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge multiple video files sequentially using FFmpeg.")
    parser.add_argument(
        "-i", "--inputs", 
        nargs="+", 
        required=True, 
        help="List of input video files in the order they should be merged (e.g., -i scene1.mp4 scene2.mp4 scene3.mp4)"
    )
    parser.add_argument(
        "-o", "--output", 
        default="merged_output_ffmpeg.mp4", 
        help="Output file path (default: merged_output_ffmpeg.mp4)"
    )
    
    args = parser.parse_args()
    merge_videos_ffmpeg(args.inputs, args.output)
