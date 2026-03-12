import os
import argparse
from moviepy.editor import VideoFileClip, concatenate_videoclips

def merge_videos(input_files, output_file):
    """
    Merges multiple video files into a single video file using MoviePy.
    
    Args:
        input_files (list): List of paths to the video files to merge in order.
        output_file (str): Path to save the merged video.
    """
    # Verify all files exist
    valid_files = []
    for f in input_files:
        if not os.path.exists(f):
            print(f"Warning: File not found: {f}")
        else:
            valid_files.append(f)
            
    if not valid_files:
        print("Error: No valid input files found to merge.")
        return

    print(f"Preparing to merge {len(valid_files)} videos...")
    clips = []
    try:
        # Load the clips
        clips = [VideoFileClip(f) for f in valid_files]
        
        # Concatenate them using "compose" to handle different resolutions/framerates if they exist
        # If all videos from Gemini have the exact same size/FPS, you can use method="chain" which is faster.
        final_clip = concatenate_videoclips(clips, method="compose")
        
        # Write the result to a file
        print(f"Saving combined video to: {output_file}...")
        final_clip.write_videofile(
            output_file, 
            codec="libx264", 
            audio_codec="aac",
            temp_audiofile="temp-audio.m4a",
            remove_temp=True,
            logger="bar" # Shows a progress bar
        )
        
        print(f"Successfully created: {output_file}")
        
    except Exception as e:
        print(f"An error occurred during video merging: {e}")
    finally:
        # It's important to close clips to release file handles
        for clip in clips:
            try:
                clip.close()
            except:
                pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge multiple video files sequentially.")
    parser.add_argument(
        "-i", "--inputs", 
        nargs="+", 
        required=True, 
        help="List of input video files in the order they should be merged (e.g., -i scene1.mp4 scene2.mp4 scene3.mp4)"
    )
    parser.add_argument(
        "-o", "--output", 
        default="merged_output.mp4", 
        help="Output file path (default: merged_output.mp4)"
    )
    
    args = parser.parse_args()
    merge_videos(args.inputs, args.output)
